import { postFileServer, putFileServer } from '@/apis/adminService';
import { useTranslation } from 'next-i18next';
import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { useForm } from 'react-hook-form';
import { Form, FormField } from '../../ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormFieldType, IFormFieldOption } from '../../ui/form/type';
import FormInput from '../../ui/form/input';
import FormSwitch from '../../ui/form/switch';
import FormTextarea from '../../ui/form/textarea';
import { Button } from '../../ui/button';
import FormSelect from '@/components/ui/form/select';
import {
  FileServerType,
  PostFileServerParams,
  PutFileServerParams,
} from '@/types/file';
import { getFileConfigs } from '@/utils/file';
import { GetFileServerResult } from '@/types/admin';
import { mergeConfigs } from '@/utils/model';

interface IProps {
  selected: GetFileServerResult | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccessful: () => void;
  saveLoading?: boolean;
}

export const FileServerModal = (props: IProps) => {
  const { t } = useTranslation('admin');
  const { selected, isOpen, onClose, onSuccessful } = props;
  const formFields: IFormFieldOption[] = [
    {
      name: 'type',
      label: t('File Server Type'),
      defaultValue: '',
      render: (options: IFormFieldOption, field: FormFieldType) => (
        <FormSelect
          items={Object.keys(FileServerType).map((key) => ({
            name: FileServerType[key as keyof typeof FileServerType],
            value: FileServerType[key as keyof typeof FileServerType],
          }))}
          options={options}
          field={field}
        />
      ),
    },
    {
      name: 'name',
      label: t('Server Name'),
      defaultValue: '',
      render: (options: IFormFieldOption, field: FormFieldType) => (
        <FormInput options={options} field={field} />
      ),
    },
    {
      name: 'enabled',
      label: t('Is it enabled'),
      defaultValue: true,
      render: (options: IFormFieldOption, field: FormFieldType) => (
        <FormSwitch options={options} field={field} />
      ),
    },
    {
      name: 'configs',
      label: t('Server Configs'),
      defaultValue: '',
      render: (options: IFormFieldOption, field: FormFieldType) => (
        <FormTextarea options={options} field={field} />
      ),
    },
  ];

  const formSchema = z.object({
    type: z
      .string()
      .min(1, `${t('This field is require')}`)
      .optional(),
    name: z
      .string()
      .min(1, `${t('This field is require')}`)
      .optional(),
    enabled: z.boolean().optional(),
    configs: z
      .string()
      .min(1, `${t('This field is require')}`)
      .optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: formFields.reduce((obj: any, field) => {
      obj[field.name] = field.defaultValue;
      return obj;
    }, {}),
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!form.formState.isValid) return;
    let p = null;
    if (selected) {
      p = putFileServer({ ...values, id: selected.id } as PutFileServerParams);
    } else {
      p = postFileServer(values as PostFileServerParams);
    }
    p.then(() => {
      onSuccessful();
      toast.success(t('Save successful!'));
    }).catch(() => {
      toast.error(
        t(
          'Operation failed! Please try again later, or contact technical personnel.'
        )
      );
    });
  }

  useEffect(() => {
    if (isOpen) {
      form.reset();
      form.formState.isValid;
      if (selected) {
        form.setValue('name', selected.name);
        form.setValue('type', selected.type);
        form.setValue('enabled', selected.enabled);
        form.setValue(
          'configs',
          mergeConfigs(getFileConfigs(selected.type), selected.configs)
        );
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name === 'type' && type === 'change') {
        const type = value.type as FileServerType;
        form.setValue(
          'configs',
          JSON.stringify(getFileConfigs(type) || {}, null, 2)
        );
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Add File Server')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {formFields.map((item) => (
              <FormField
                key={item.name}
                control={form.control}
                name={item.name as never}
                render={({ field }) => item.render(item, field)}
              />
            ))}
            <DialogFooter className='pt-4'>
              <Button type='submit'>{t('Save')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
